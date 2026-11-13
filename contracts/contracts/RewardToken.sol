// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RewardToken
/// @notice Closed-loop reward token. Only the issuer (our backend service) can
/// create tokens (reward) or destroy them (redeem / clawback). Users cannot
/// send tokens to each other, so the token cannot be traded or cashed out.
contract RewardToken is ERC20, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    /// @notice Every operation carries a unique reference from our ledger.
    /// Once used, a reference can never be used again, so a retried
    /// transaction can never mint or burn twice.
    mapping(bytes32 => bool) public processed;

    error TransfersDisabled();
    error AlreadyProcessed(bytes32 ref);

    event Rewarded(address indexed to, uint256 amount, bytes32 indexed ref);
    event Redeemed(address indexed from, uint256 amount, bytes32 indexed ref);

    constructor(address admin, address issuer) ERC20("Partner Reward", "PRWD") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, issuer);
    }

    /// @dev Whole points only: 1 token = 1 reward point.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function reward(address to, uint256 amount, bytes32 ref) external onlyRole(ISSUER_ROLE) {
        _useRef(ref);
        _mint(to, amount);
        emit Rewarded(to, amount, ref);
    }

    /// @notice Used for both spending (redeem at checkout) and refund clawback.
    function redeem(address from, uint256 amount, bytes32 ref) external onlyRole(ISSUER_ROLE) {
        _useRef(ref);
        _burn(from, amount);
        emit Redeemed(from, amount, ref);
    }

    function _useRef(bytes32 ref) private {
        if (processed[ref]) revert AlreadyProcessed(ref);
        processed[ref] = true;
    }

    /// @dev Block user-to-user transfers. Minting (from = 0) and burning (to = 0) still work.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) revert TransfersDisabled();
        super._update(from, to, value);
    }
}
